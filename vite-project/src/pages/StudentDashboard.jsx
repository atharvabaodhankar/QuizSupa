import { useEffect, useState, useMemo } from 'react'
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
  Spinner,
} from '@chakra-ui/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function StudentDashboard() {
  // State hooks
  const [availableTests, setAvailableTests] = useState([])
  const [testHistory, setTestHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)

  // Context hooks
  const { user } = useAuth()
  const toast = useToast()

  // Color mode hooks
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const textColor = useColorModeValue('gray.600', 'gray.300')

  // Memoized functions
  const calculateScore = useMemo(() => (attempt) => {
    if (!attempt?.score || !attempt?.test?.totalPoints) return 0
    return Math.round((attempt.score / attempt.test.totalPoints) * 100)
  }, [])

  // Effect hooks
  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      console.log('Current user ID:', user.id)

      // Debug: Check current user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        console.error('Error fetching profile:', profileError)
      } else {
        console.log('Current user profile:', profileData)
      }

      // First fetch the user's profile
      setUserProfile(profileData)

      // Then fetch other data
      await Promise.all([
        fetchAvailableTests(),
        fetchTestHistory()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: 'Error loading data',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableTests = async () => {
    if (!user) return

    try {
      // Get all completed attempts by the user
      const { data: attempts, error: attemptsError } = await supabase
        .from('test_attempts')
        .select('test_id')
        .eq('student_id', user.id)
        .not('completed_at', 'is', null)

      if (attemptsError) throw attemptsError

      // Get all published tests
      const { data: allTests, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (testsError) throw testsError

      // Filter tests based on attempts and unlimited attempts setting
      const attemptedTestIds = new Set(attempts?.map(a => a.test_id) || [])
      const availableTests = allTests.filter(test => 
        !attemptedTestIds.has(test.id) || // Show tests that haven't been attempted
        test.allow_unlimited_attempts      // Or tests that allow unlimited attempts
      )

      setAvailableTests(availableTests)
    } catch (error) {
      console.error('Error fetching available tests:', error)
      throw error
    }
  }

  const fetchTestHistory = async () => {
    if (!user) return

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
        .eq('student_id', user.id)
        .not('completed_at', 'is', null)  // Only show completed tests
        .order('completed_at', { ascending: false })  // Order by completion date

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
      console.error('Error fetching test history:', error)
      throw error
    }
  }

  // Loading state
  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Stack spacing={4} align="center">
          <Spinner size="xl" />
          <Text>Loading dashboard...</Text>
        </Stack>
      </Container>
    )
  }

  // Main render
  return (
    <Container maxW="container.xl" py={{ base: '8', md: '12' }}>
      <Stack spacing={{ base: '8', md: '12' }}>
        <Stack>
          <Heading size="lg">Welcome, {userProfile?.name || 'Student'}</Heading>
          <Text color={textColor}>
            Roll Number: {userProfile?.roll_number || 'Not set'}
          </Text>
        </Stack>

        <Tabs>
          <TabList>
            <Tab>Available Tests</Tab>
            <Tab>Test History</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              {availableTests.length === 0 ? (
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
                          <Text color={textColor}>
                            {test.description}
                          </Text>
                          <Text fontSize="sm" color={textColor}>
                            Created by Teacher
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
                          to={`/take-test/${test.id}`}
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
              {testHistory.length === 0 ? (
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
                      <Stack spacing={4}>
                        <Stack>
                          <Heading size="md">{attempt.test.title}</Heading>
                          <Text color={textColor}>
                            {attempt.test.description}
                          </Text>
                        </Stack>

                        <HStack spacing={4}>
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="bold">Score</Text>
                            <Text>
                              {attempt.score}/{attempt.test.totalPoints} ({calculateScore(attempt)}%)
                            </Text>
                          </VStack>

                          <VStack align="start" spacing={1}>
                            <Text fontWeight="bold">Status</Text>
                            <Badge colorScheme={calculateScore(attempt) >= 40 ? 'green' : 'red'}>
                              {calculateScore(attempt) >= 40 ? 'Pass' : 'Fail'}
                            </Badge>
                          </VStack>

                          <VStack align="start" spacing={1}>
                            <Text fontWeight="bold">Completed</Text>
                            <Text>
                              {new Date(attempt.completed_at).toLocaleString()}
                            </Text>
                          </VStack>
                        </HStack>
                      </Stack>
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