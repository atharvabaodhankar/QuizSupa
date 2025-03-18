import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Heading,
  Stack,
  Text,
  useColorModeValue,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Progress,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  SimpleGrid,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
} from '@chakra-ui/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function TestAnalytics() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [test, setTest] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [analytics, setAnalytics] = useState({
    totalAttempts: 0,
    averageScore: 0,
    passRate: 0,
    highestScore: 0,
    lowestScore: 0,
  })

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user) {
        setError('Please log in to view analytics')
        setLoading(false)
        return
      }

      if (!id) {
        setError('No test ID provided')
        setLoading(false)
        return
      }

      try {
        console.log('Loading analytics for test:', id)
        await fetchTestData()
      } catch (error) {
        console.error('Error loading analytics:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [user, id])

  const fetchTestData = async () => {
    try {
      // Fetch test details with questions and points
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select(`
          *,
          questions (
            id,
            text,
            points
          )
        `)
        .eq('id', id)
        .single()

      if (testError) throw testError

      // Calculate total points
      const totalPoints = testData.questions.reduce((sum, q) => sum + q.points, 0)

      // Fetch test attempts with student profiles
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('test_attempts')
        .select(`
          *,
          student:profiles (
            name,
            roll_number
          )
        `)
        .eq('test_id', id)
        .order('completed_at', { ascending: false })

      if (attemptsError) throw attemptsError

      // Calculate analytics
      const completedAttempts = attemptsData.filter(a => a.completed_at)
      const scores = completedAttempts.map(a => a.score)
      const analytics = {
        totalAttempts: completedAttempts.length,
        averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        passRate: scores.length ? Math.round((scores.filter(s => s >= totalPoints * 0.4).length / scores.length) * 100) : 0,
        highestScore: scores.length ? Math.max(...scores) : 0,
        lowestScore: scores.length ? Math.min(...scores) : 0,
      }

      setTest(testData)
      setAttempts(attemptsData)
      setTotalPoints(totalPoints)
      setAnalytics(analytics)
    } catch (error) {
      console.error('Error fetching test data:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Stack spacing={4} align="center">
          <Spinner size="xl" />
          <Text>Loading analytics...</Text>
        </Stack>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={{ base: '8', md: '12' }}>
      <Stack spacing={{ base: '8', md: '12' }}>
        <Stack>
          <Heading size="lg">{test?.title} - Analytics</Heading>
          <Text color={useColorModeValue('gray.600', 'gray.300')}>
            View student performance and test statistics
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={6}>
          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Total Attempts</StatLabel>
              <StatNumber>{analytics.totalAttempts}</StatNumber>
            </Stat>
          </Box>
          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Average Score</StatLabel>
              <StatNumber>{analytics.averageScore}/{totalPoints}</StatNumber>
            </Stat>
          </Box>
          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Pass Rate</StatLabel>
              <StatNumber>{analytics.passRate}%</StatNumber>
            </Stat>
          </Box>
          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Highest Score</StatLabel>
              <StatNumber>{analytics.highestScore}/{totalPoints}</StatNumber>
            </Stat>
          </Box>
          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Lowest Score</StatLabel>
              <StatNumber>{analytics.lowestScore}/{totalPoints}</StatNumber>
            </Stat>
          </Box>
        </SimpleGrid>

        <Box
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          overflow="hidden"
        >
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Student Name</Th>
                <Th>Roll Number</Th>
                <Th>Score</Th>
                <Th>Percentage</Th>
                <Th>Status</Th>
                <Th>Completed At</Th>
              </Tr>
            </Thead>
            <Tbody>
              {attempts.map((attempt) => {
                const percentage = Math.round((attempt.score / totalPoints) * 100)
                return (
                  <Tr key={attempt.id}>
                    <Td>{attempt.student?.name || 'N/A'}</Td>
                    <Td>{attempt.student?.roll_number || 'N/A'}</Td>
                    <Td>
                      {attempt.completed_at ? `${attempt.score}/${totalPoints}` : 'In Progress'}
                    </Td>
                    <Td>
                      {attempt.completed_at ? (
                        <Progress
                          value={percentage}
                          size="sm"
                          colorScheme={percentage >= 40 ? 'green' : 'red'}
                        />
                      ) : (
                        'In Progress'
                      )}
                    </Td>
                    <Td>
                      {attempt.completed_at ? (
                        <Badge colorScheme={percentage >= 40 ? 'green' : 'red'}>
                          {percentage >= 40 ? 'Pass' : 'Fail'}
                        </Badge>
                      ) : (
                        <Badge colorScheme="yellow">In Progress</Badge>
                      )}
                    </Td>
                    <Td>
                      {attempt.completed_at
                        ? new Date(attempt.completed_at).toLocaleString()
                        : 'Not completed'}
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </Box>
      </Stack>
    </Container>
  )
} 