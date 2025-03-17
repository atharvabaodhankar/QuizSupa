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
} from '@chakra-ui/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function TestAnalytics() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  const [loading, setLoading] = useState(true)
  const [test, setTest] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [analytics, setAnalytics] = useState({
    totalAttempts: 0,
    averageScore: 0,
    passRate: 0,
    highestScore: 0,
    lowestScore: 100,
  })

  useEffect(() => {
    fetchTestData()
  }, [testId])

  const fetchTestData = async () => {
    try {
      // Fetch test details
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select(`
          *,
          questions (
            points
          )
        `)
        .eq('id', testId)
        .single()

      if (testError) throw testError

      // Calculate total possible points
      const totalPoints = testData.questions.reduce((sum, q) => sum + q.points, 0)

      // Verify ownership
      if (testData.created_by !== user.id) {
        toast({
          title: 'Access denied',
          description: 'You do not have permission to view this test\'s analytics',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        navigate('/teacher/dashboard')
        return
      }

      // Fetch test attempts with user profiles
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('test_attempts')
        .select(`
          *,
          profiles!user_id (
            role
          )
        `)
        .eq('test_id', testId)
        .not('completed_at', 'is', null) // Only get completed attempts
        .order('created_at', { ascending: false })

      if (attemptsError) throw attemptsError

      // Calculate analytics
      const totalAttempts = attemptsData.length
      const scores = attemptsData.map((attempt) => (attempt.score / totalPoints) * 100)
      const averageScore = totalAttempts > 0 ? scores.reduce((a, b) => a + b, 0) / totalAttempts : 0
      const passRate = totalAttempts > 0 
        ? (attemptsData.filter((attempt) => attempt.score >= totalPoints * 0.7).length / totalAttempts) * 100 
        : 0
      const highestScore = totalAttempts > 0 ? Math.max(...scores) : 0
      const lowestScore = totalAttempts > 0 ? Math.min(...scores) : 0

      setTest({ ...testData, totalPoints })
      setAttempts(attemptsData)
      setAnalytics({
        totalAttempts,
        averageScore,
        passRate,
        highestScore,
        lowestScore,
      })
    } catch (error) {
      toast({
        title: 'Error loading test analytics',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      navigate('/teacher/dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>Loading analytics...</Text>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={8}>
        <Stack>
          <Heading size="lg">{test.title} - Analytics</Heading>
          <Text color={useColorModeValue('gray.600', 'gray.300')}>
            View detailed performance analytics for this test
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4}>
          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Total Attempts</StatLabel>
              <StatNumber>{analytics.totalAttempts}</StatNumber>
            </Stat>
          </Box>

          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Average Score</StatLabel>
              <StatNumber>{analytics.averageScore.toFixed(1)}%</StatNumber>
            </Stat>
          </Box>

          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Pass Rate</StatLabel>
              <StatNumber>{analytics.passRate.toFixed(1)}%</StatNumber>
            </Stat>
          </Box>

          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Highest Score</StatLabel>
              <StatNumber>{analytics.highestScore.toFixed(1)}%</StatNumber>
            </Stat>
          </Box>

          <Box p={6} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <Stat>
              <StatLabel>Lowest Score</StatLabel>
              <StatNumber>{analytics.lowestScore.toFixed(1)}%</StatNumber>
            </Stat>
          </Box>
        </SimpleGrid>

        <Box
          p={6}
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          overflowX="auto"
        >
          <Stack spacing={4}>
            <Heading size="md">Attempt History</Heading>

            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Score</Th>
                  <Th>Progress</Th>
                  <Th>Status</Th>
                  <Th>Duration</Th>
                </Tr>
              </Thead>
              <Tbody>
                {attempts.map((attempt) => {
                  const score = (attempt.score / test.totalPoints) * 100
                  const duration = attempt.completed_at
                    ? Math.round(
                        (new Date(attempt.completed_at) - new Date(attempt.started_at)) / 1000 / 60
                      )
                    : null

                  return (
                    <Tr key={attempt.id}>
                      <Td>{new Date(attempt.started_at).toLocaleDateString()}</Td>
                      <Td>
                        {attempt.score} / {test.totalPoints} ({score.toFixed(1)}%)
                      </Td>
                      <Td>
                        <Progress
                          value={score}
                          colorScheme={score >= 70 ? 'green' : 'red'}
                          size="sm"
                          borderRadius="full"
                          width="200px"
                        />
                      </Td>
                      <Td>
                        <Badge colorScheme={score >= 70 ? 'green' : 'red'}>
                          {score >= 70 ? 'Pass' : 'Fail'}
                        </Badge>
                      </Td>
                      <Td>{duration ? `${duration} minutes` : 'In Progress'}</Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </Stack>
        </Box>
      </Stack>
    </Container>
  )
} 