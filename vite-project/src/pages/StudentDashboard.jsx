import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  Grid,
  Heading,
  Stack,
  Text,
  useColorModeValue,
  useToast,
  VStack,
  HStack,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
} from '@chakra-ui/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function StudentDashboard() {
  const [availableTests, setAvailableTests] = useState([])
  const [testHistory, setTestHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const toast = useToast()

  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  useEffect(() => {
    fetchAvailableTests()
    fetchTestHistory()
  }, [])

  const fetchAvailableTests = async () => {
    try {
      // Get all completed attempts by the user
      const { data: attempts, error: attemptsError } = await supabase
        .from('test_attempts')
        .select('test_id')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      if (attemptsError) throw attemptsError;

      // Get all published tests
      const { data: allTests, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;

      // Filter tests based on attempts and unlimited attempts setting
      const attemptedTestIds = new Set(attempts?.map(a => a.test_id) || []);
      const availableTests = allTests.filter(test => 
        !attemptedTestIds.has(test.id) || // Show tests that haven't been attempted
        test.allow_unlimited_attempts      // Or tests that allow unlimited attempts
      );

      setAvailableTests(availableTests);
    } catch (error) {
      toast({
        title: 'Error fetching available tests',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const fetchTestHistory = async () => {
    try {
      const { data: testHistory, error: historyError } = await supabase
        .from('test_attempts')
        .select(`
          *,
          test:tests (
            id,
            title,
            description,
            duration,
            questions (
              points
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (historyError) throw historyError

      // Calculate total points for each test
      const processedHistory = testHistory.map(attempt => {
        const totalPoints = attempt.test.questions.reduce((sum, q) => sum + q.points, 0)
        return {
          ...attempt,
          test: {
            ...attempt.test,
            totalPoints
          }
        }
      })

      setTestHistory(processedHistory)
    } catch (error) {
      toast({
        title: 'Error fetching test history',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateScore = (attempt) => {
    if (!attempt?.score || !attempt?.test?.totalPoints) return 0
    return Math.round((attempt.score / attempt.test.totalPoints) * 100)
  }

  return (
    <Container maxW="container.xl" py={{ base: '8', md: '12' }}>
      <Stack spacing={{ base: '8', md: '12' }}>
        <Stack>
          <Heading size="lg">Student Dashboard</Heading>
          <Text color={useColorModeValue('gray.600', 'gray.300')}>
            View available tests and your test history
          </Text>
        </Stack>

        <Tabs>
          <TabList>
            <Tab>Available Tests</Tab>
            <Tab>Test History</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              {loading ? (
                <Text>Loading available tests...</Text>
              ) : availableTests.length === 0 ? (
                <Box
                  p={8}
                  bg={bgColor}
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderRadius="lg"
                  textAlign="center"
                >
                  <Text>No tests are currently available.</Text>
                </Box>
              ) : (
                <Grid
                  templateColumns={{
                    base: '1fr',
                    md: 'repeat(2, 1fr)',
                    lg: 'repeat(3, 1fr)',
                  }}
                  gap={6}
                >
                  {availableTests.map((test) => (
                    <Box
                      key={test.id}
                      p={6}
                      bg={bgColor}
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="lg"
                    >
                      <VStack align="stretch" spacing={4}>
                        <Stack>
                          <Heading size="md">{test.title}</Heading>
                          <Text color={useColorModeValue('gray.600', 'gray.300')}>
                            {test.description}
                          </Text>
                        </Stack>

                        <HStack spacing={2}>
                          <Badge colorScheme="blue">
                            {test.duration} minutes
                          </Badge>
                          {test.allow_unlimited_attempts && (
                            <Badge colorScheme="green">
                              Unlimited attempts
                            </Badge>
                          )}
                        </HStack>

                        <Button
                          as={RouterLink}
                          to={`/test/${test.id}`}
                          colorScheme="blue"
                        >
                          Start Test
                        </Button>
                      </VStack>
                    </Box>
                  ))}
                </Grid>
              )}
            </TabPanel>

            <TabPanel>
              {loading ? (
                <Text>Loading test history...</Text>
              ) : testHistory.length === 0 ? (
                <Box
                  p={8}
                  bg={bgColor}
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderRadius="lg"
                  textAlign="center"
                >
                  <Text>You haven't taken any tests yet.</Text>
                </Box>
              ) : (
                <Stack spacing={6}>
                  {testHistory.map((attempt) => (
                    <Box
                      key={attempt.id}
                      p={6}
                      bg={bgColor}
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="lg"
                    >
                      <VStack align="stretch" spacing={4}>
                        <Stack direction="row" justify="space-between" align="center">
                          <Stack>
                            <Heading size="md">{attempt.test?.title || 'Untitled Test'}</Heading>
                            <Text color={useColorModeValue('gray.600', 'gray.300')}>
                              {new Date(attempt.started_at).toLocaleDateString()}
                            </Text>
                          </Stack>
                          <Badge
                            colorScheme={attempt.score >= (attempt.test.totalPoints * 0.7) ? 'green' : 'red'}
                            fontSize="md"
                            px={3}
                            py={1}
                          >
                            {attempt.score} / {attempt.test.totalPoints} points
                          </Badge>
                        </Stack>

                        <Progress
                          value={calculateScore(attempt)}
                          colorScheme={attempt.score >= (attempt.test.totalPoints * 0.7) ? 'green' : 'red'}
                          size="sm"
                          borderRadius="full"
                        />

                        <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.300')}>
                          Duration: {attempt.test?.duration || 0} minutes
                        </Text>
                      </VStack>
                    </Box>
                  ))}
                </Stack>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </Container>
  )
} 